import { build } from 'encaps';

export const model1 = build()
	.initState(() => ({ value: 10 }))
	.handlers({
		setValue: 'value',
	});
