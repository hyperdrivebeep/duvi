// Run in the browser against the open roadmap, with enough content to scroll.
export function focusRoadmapRow() {
  const dialog=document.querySelector('#learningDialog');
  const header=dialog.querySelector('.dialog-header');
  const row=dialog.querySelectorAll('.learning-phase > summary')[3];
  row.scrollIntoView({block:'start',behavior:'instant'});
  row.focus({preventScroll:true});
  const gap=row.getBoundingClientRect().top-header.getBoundingClientRect().bottom;
  if(document.activeElement!==row||gap<5)throw new Error(`Focused roadmap row overlaps the header or focus ring (gap: ${gap}px)`);
  return {gap,headerHeight:header.getBoundingClientRect().height};
}
