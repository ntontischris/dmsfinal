// Πρόταση 5: ο shader του φωτός (raw WebGL, χωρίς βιβλιοθήκες).

const VERTEX = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

const FRAGMENT = `
precision highp float;
uniform vec2 r; uniform float t; uniform vec2 l; uniform float lt;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/r; float asp=r.x/r.y;
  vec2 p=vec2(uv.x*asp,uv.y); vec2 L=vec2(l.x*asp,l.y); vec2 d=p-L; float dist=length(d);
  float haze=fbm(p*1.7+vec2(t*.025,-t*.018));
  float leakA=smoothstep(.42,.95,fbm(p*.85+vec2(t*.045,t*.012)))*smoothstep(.1,1.5,p.x+.35*sin(t*.09));
  float leakT=smoothstep(.48,.98,fbm(p*1.05-vec2(t*.038,-t*.02)+7.3))*smoothstep(1.3,.0,p.x);
  float core=exp(-dist*7.5)*.95+exp(-dist*3.4)*.09;
  float streak=exp(-abs(d.y)*85.)*exp(-abs(d.x)*1.05);
  float hair=exp(-abs(d.y)*420.)*exp(-abs(d.x)*.3);
  float ang=atan(d.y,d.x);
  float rays=n(vec2(ang*7.,t*.18))*exp(-dist*3.)*.22;
  vec2 c=vec2(asp*.5,.5); float ghosts=0.;
  for(int i=1;i<4;i++){float fi=float(i);vec2 gp=c-(L-c)*(.35+.4*fi);float gr=length(p-gp);
    ghosts+=smoothstep(.07*fi,.0,abs(gr-.05*fi))*.06/fi;}
  float pulse=1.+.12*sin(t*.6)+.05*sin(t*1.7);
  float grain=h(gl_FragCoord.xy+fract(t*7.)*91.)-.5;
  float vig=1.-.6*pow(length(uv-.5)*1.25,2.);
  vec3 amber=vec3(1.,.52,.18), teal=vec3(.08,.55,.62);
  vec3 col;
  if(lt<.5){
    col=mix(vec3(.012,.016,.026),vec3(.045,.035,.035),uv.y);
    col+=amber*leakA*leakA*.42+teal*leakT*.55+vec3(.9,.8,.7)*haze*haze*.05;
    col+=(vec3(.5,.72,1.)*(streak*.85+hair*.7)+vec3(1.,.86,.7)*core+vec3(1.,.8,.6)*rays)*pulse;
    col+=vec3(.35,.7,.8)*ghosts;
    col*=vig; col=1.-exp(-col*1.45); col+=grain*.055;
  } else {
    vec3 paper=vec3(.955,.94,.91);
    col=mix(paper,vec3(1.,.76,.52),leakA*.6);
    col=mix(col,vec3(.52,.79,.82),leakT*.55);
    col-=vec3(.05)*haze*.2;
    col=mix(col,vec3(1.,.84,.6),exp(-dist*2.3)*.6);
    col=mix(col,vec3(1.,.99,.96),clamp(core*1.5,0.,1.));
    col=mix(col,vec3(.28,.48,.86),clamp((streak*.65+hair*.55)*pulse,0.,1.));
    col-=vec3(.14,.06,.0)*ghosts*3.;
    col*=mix(1.,vig,.25); col+=grain*.035;
  }
  gl_FragColor=vec4(col,1.);
}`;

export interface LightScene {
  start: () => void;
  stop: () => void;
  draw: (time: number) => void;
  setPointer: (x: number, y: number) => void;
  dispose: () => void;
}

const compile = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
};

const createProgram = (gl: WebGLRenderingContext) => {
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
};

const isLightTheme = () => document.documentElement.dataset.theme === "light";

export const createLightScene = (
  canvas: HTMLCanvasElement,
  onFrame: (time: number) => void,
): LightScene | null => {
  const gl = canvas.getContext("webgl", {
    antialias: false,
    premultipliedAlpha: false,
  });
  if (!gl) return null;
  if (gl.isContextLost()) return null;
  const program = createProgram(gl);
  if (!program) return null;

  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  const attribute = gl.getAttribLocation(program, "a");
  gl.enableVertexAttribArray(attribute);
  gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
  const u = (name: string) => gl.getUniformLocation(program, name);
  const [uRes, uTime, uLight, uTheme] = [u("r"), u("t"), u("l"), u("lt")];

  const target = { x: 0.68, y: 0.58 };
  const light = { ...target };
  let frame = 0;
  const startedAt = performance.now();

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr * 0.75));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr * 0.75));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  };

  const draw = (time: number) => {
    resize();
    light.x += (target.x - light.x) * 0.045;
    light.y += (target.y - light.y) * 0.045;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, time);
    gl.uniform2f(uLight, light.x, light.y);
    gl.uniform1f(uTheme, isLightTheme() ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    onFrame(time);
  };

  const loop = () => {
    draw((performance.now() - startedAt) / 1000);
    frame = requestAnimationFrame(loop);
  };

  return {
    start: () => {
      if (!frame) frame = requestAnimationFrame(loop);
    },
    stop: () => {
      cancelAnimationFrame(frame);
      frame = 0;
    },
    draw,
    setPointer: (x, y) => {
      target.x = x;
      target.y = y;
    },
    dispose: () => {
      cancelAnimationFrame(frame);
      // Σβήνουμε μόνο τους πόρους: το context μένει στον καμβά (το StrictMode ξανατρέχει το effect).
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
};
