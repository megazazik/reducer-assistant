import { createModule } from '../../';
import { model3 } from './model';
import { Model3Assistant } from './assistant';
import module1 from '../module1';
import module2 from '../module2';

export default createModule({
	model: model3,
	effects: [Model3Assistant],
	children: [module1, module2],
});
