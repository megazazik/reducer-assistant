import { model2 } from './model';
import { Assistant } from '../..';

export class Model2Assistant extends Assistant<
	ReturnType<typeof model2.reducer>
> {
	onInit() {
		this.onChange(() => {
			console.log('Model 2 onchange');
		});
	}
}
