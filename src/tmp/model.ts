import { build } from 'encaps';
import { model3 } from './module3/model';

export const model = build().children({ model3 });
