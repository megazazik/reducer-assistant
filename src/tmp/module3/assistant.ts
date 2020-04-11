import { model3 } from './model';
import { Assistant } from '../..';

export class Model3Assistant extends Assistant<
	ReturnType<typeof model3.reducer>
> {}
