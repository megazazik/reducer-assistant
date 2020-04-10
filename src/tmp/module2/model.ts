import { build } from 'encaps';

export const model2 = build()
	.initState(() => ({ value: '10' }))
	.handlers({
		setValue: 'value',
	});
