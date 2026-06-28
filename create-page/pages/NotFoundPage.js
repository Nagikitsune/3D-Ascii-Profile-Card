function NotFoundPage(){
  const el = document.createElement('div');
  el.innerHTML = `
    <h2 style="font-family:var(--display); color:var(--yellow); margin-top:0;">404 // NOT FOUND</h2>
    <p style="color:var(--green-dim);">The requested module is missing or offline.</p>
  `;
  return el;
}
