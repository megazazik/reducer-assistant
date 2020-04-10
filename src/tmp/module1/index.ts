import { createModule } from '../../';
import { model1 } from './model';
import { Model1Assistant } from './assistant';

export default createModule({
	model: model1,
	effects: [Model1Assistant],
});
