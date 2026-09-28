declare module 'highlight.js/lib/core' {
  const hljs: any;
  export default hljs;
}

declare module 'highlight.js/lib/languages/*' {
  const language: (hljs?: any) => any;
  export default language;
}
