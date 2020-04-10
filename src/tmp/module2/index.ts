import { createModule } from '../../';
import { model2 } from './model';
import { Model2Assistant } from './assistant';

export default createModule({
	model: model2,
	effects: [Model2Assistant],
});
