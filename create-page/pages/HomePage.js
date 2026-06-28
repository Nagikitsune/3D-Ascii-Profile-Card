function HomePage(){
  const el = document.createElement('div');
  el.innerHTML = `
    <h1 style="font-family:var(--display); color:var(--yellow); letter-spacing:2px; margin-top:0;">DAEDALUS // SYSTEM READY</h1>
    <p style="color:var(--green-dim); max-width:640px; line-height:1.6;">
      Welcome to the Daedalus UI shell. Use the sidebar to navigate between modules.
      This is a single-page application router built to match the existing profile card aesthetic.
    </p>
    <pre style="background:rgba(46,0,48,0.15); border:1px solid var(--grid); padding:12px; color:var(--green-faint); font-size:12px;">
> init daedalus_ui
> load router     OK
> load layout     OK
> await modules...
    </pre>
  `;
  return el;
}
