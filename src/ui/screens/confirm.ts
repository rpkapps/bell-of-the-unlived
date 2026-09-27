/**
 * Modal yes/no confirmation and the key-capture prompt used by the remapping screen.
 * Default focus is on the safe answer ("no") so a stray confirm press never commits.
 */
import type { UiNavEvent } from '../../input/actions';
import { h } from '../dom';
import { navItem } from '../nav';
import { Screen, type UICtx } from '../screen';

export class ConfirmScreen extends Screen {
  private done = false;

  constructor(ctx: UICtx, private title: string, private body: string, private yes: string, private no: string,
    private resolve: (v: boolean) => void, private defaultYes = false) {
    super(ctx, '');
    this.el.className = 'modal-back';
    this.onClosed = () => this.finish(false);
  }

  render(): void {
    const yesBtn = navItem(h('button.btn.primary', { 'data-key': 'yes' }, this.yes));
    const noBtn = navItem(h('button.btn', { 'data-key': 'no' }, this.no));
    yesBtn.addEventListener('click', () => { this.finish(true); this.ctx.pop(this); });
    noBtn.addEventListener('click', () => { this.finish(false); this.ctx.pop(this); });
    (this.defaultYes ? yesBtn : noBtn).setAttribute('data-nav-default', '');
    this.el.replaceChildren(h('div.modal.panel', { onclick: (e: Event) => e.stopPropagation() },
      h('div.m-title', null, this.title),
      h('div.rule.center', { style: 'margin:0.9rem 0 1.1rem' }),
      h('div.m-body', null, this.body),
      h('div.btn-row', null, yesBtn, noBtn),
      this.ctx.prompts([{ nav: 'confirm', label: 'Select' }, { nav: 'back', label: this.no, onClick: () => { this.finish(false); this.ctx.pop(this); } }])));
  }

  private finish(v: boolean): void {
    if (this.done) return;
    this.done = true;
    this.resolve(v);
  }
}

/** "Press a key…" overlay while `IInput.captureBinding` waits. Input handles cancel itself. */
export class CaptureScreen extends Screen {
  constructor(ctx: UICtx, private label: string, private device: 'kbm' | 'pad') {
    super(ctx, '');
    this.el.className = 'modal-back';
  }
  render(): void {
    this.el.replaceChildren(h('div.modal.panel', null,
      h('div.m-title', null, 'Rebind'),
      h('div.rule.center', { style: 'margin:0.9rem 0 1.1rem' }),
      h('div.m-body', null, `${this.label}\n\n`, h('span.muted', null, this.device === 'kbm'
        ? 'Press a key or mouse button.  Esc cancels.'
        : 'Press a controller button.  Start + Back cancels.'))));
  }
  // Input is suspended while capturing; ignore any stray nav events.
  override handle(_ev: UiNavEvent): void {}
}
