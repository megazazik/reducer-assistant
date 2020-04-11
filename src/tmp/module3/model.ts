import { build } from 'encaps';
import { model1 } from '../module1/model';
import { model2 } from '../module2/model';

export const model3 = build().children({ model1, model2 });

export type State3 = ReturnType<typeof model3.reducer>;
