export type Fixture = {
  id: string;
  label: string;
  stack: string;
  mapping: string;
};

export const fixtures: Fixture[] = [
  {
    id: 'readme-example',
    label: 'README example (NullPointerException)',
    stack: [
      'java.lang.NullPointerException',
      '    at a.a(Unknown Source:10)',
      '    at b.b(Unknown Source:20)',
    ].join('\n'),
    mapping: [
      'com.example.MyClass -> a:',
      '    1:1:void doThing():42:42 -> a',
      'com.example.Other -> b:',
      '    1:1:void run():12:12 -> b',
    ].join('\n'),
  },
  {
    id: 'unknown-source',
    label: 'Unknown source with cause',
    stack: [
      'com.android.tools.r8.CompilationException: foo[parens](Source:3)',
      '    at a.a.a(Unknown Source)',
      'Caused by: com.android.tools.r8.CompilationException: foo[parens](Source:3)',
      '    ... 42 more',
    ].join('\n'),
    mapping: [
      'com.android.tools.r8.R8 -> a.a:',
      '  void bar(int, int) -> a',
    ].join('\n'),
  },
];
