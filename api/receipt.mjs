import handler from '../netlify/functions/receipt.mjs';
import { adapt } from './_adapt.mjs';

export const { POST, OPTIONS, GET } = adapt(handler);
