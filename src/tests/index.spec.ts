import tape from 'tape';
import { build } from 'encaps';
import middleware from '..';

tape((t) => {
	const model = build()
		.initState(() => ({ value: 10 }))
		.handlers({
			setValue: 'value',
		});
	// .wrap(middleware({}));

	t.end();
});
