import type { ComponentType } from 'react';

import { B1 } from '@/screens/B1';
import { B2 } from '@/screens/B2';
import { B3 } from '@/screens/B3';
import { B4 } from '@/screens/B4';
import { B5 } from '@/screens/B5';
import { B6 } from '@/screens/B6';
import type { ScreenProps } from '@/screens/shared';

// Οι οθόνες που έχουν πραγματικό περιεχόμενο. Όλες οι άλλες δείχνουν ακόμα το placeholder.
export const SCREEN_CONTENT: Readonly<Record<string, ComponentType<ScreenProps>>> = { B1, B2, B3, B4, B5, B6 };
