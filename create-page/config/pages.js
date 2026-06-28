const PAGE_REGISTRY = [
  { path: '/',         label: 'Home',           icon: '►', component: HomePage },
  { path: '/stl',     label: 'STL Uploader',   icon: '▣', component: StlUploaderPage },
  { path: '/gif',     label: 'GIF Uploader',   icon: '▤', component: GifUploaderPage },
  { path: '/custom',  label: 'Customization',  icon: '◈', component: CustomizationPage },
  { path: '/card',    label: 'Profile Card',   icon: '◉', component: ProfileCardPage },
];

/* Usage:
   import or load this file before app initialization.
   Each entry:
     path        - router hash path
     label       - sidebar display text
     icon        - prefix glyph
     component   - function returning a DOM Node
*/
