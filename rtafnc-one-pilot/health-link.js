document.addEventListener('click',function(event){
  const target=event.target.closest('[data-soon="health"]');
  if(!target) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  window.location.href='health.html';
},true);
