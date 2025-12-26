// screens/ui/theme.js - Update with these exports:
import { Appearance } from 'react-native';
const scheme = 'light';

export const Colors = {
  primary: '#0F4C75', // Deep Ocean Blue
  primaryLight: '#3282B8', // Serene Sky Blue
  primaryDark: '#1B262C', // Midnight Slate
  accent: '#BBE1FA', // Soft Mist Blue
  bg: '#F8FAFC', // Near-white Slate (Ultra Clean)
  card: '#FFFFFF',
  text: '#1A202C', // Deep Slate Gray
  sub: '#718096', // Mid Gray Slate
  good: '#10B981', // Emerald Green
  warn: '#F59E0B', // Amber Gold
  bad: '#EF4444', // Rose Red
  line: '#E2E8F0', // Light Slate Line
};

export const Radii = { sm: 6, md: 10, lg: 16, xl: 24, pill: 999 };
export const Sp = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const Typo = { h1: 28, h2: 20, body: 16, small: 13 };

export const Shadows = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 8 },
};