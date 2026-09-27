/**
 * Title / home screen (follows concept-art/ui/selected/home-screen.png): a dark left panel with the
 * title, a vertical gold line with diamond nodes and hairlines, and the menu; the right side stays
 * transparent so the game's 3D title vista shows through. Also the Credits & Licenses screen.
 */
import { h, fmtTime } from '../dom';
import { icon } from '../icons';
import { menuItem, Screen, type UICtx } from '../screen';
import { SettingsScreen } from './settings';

export class TitleScreen extends Screen {
  override hud = 'hidden' as const;

  constructor(ctx: UICtx) { super(ctx, 'title-screen'); }

  render(): void {
    const host = this.ctx.host;
    const save = host.hasSave() ? host.saveSummary() : null;
    const menu = h('div.menu', { 'data-nav-wrap': '' });
    if (save) {
      const cont = menuItem('Continue', null, () => { this.ctx.sound('ui_confirm'); host.continueGame(); }, {
        key: 'continue', sub: `${save.location} · Level ${save.level} · ${fmtTime(save.playtime)}`,
      });
      cont.setAttribute('data-nav-default', '');
      menu.appendChild(cont);
    }
    const ng = menuItem('New Journey', null, () => void this.newJourney(!!save), { key: 'new', sub: save ? 'Begin again, from the first day of service' : 'Begin on the first day of service' });
    if (!save) ng.setAttribute('data-nav-default', '');
    menu.append(ng,
      menuItem('Settings', null, () => this.ctx.push(new SettingsScreen(this.ctx)), { key: 'settings' }),
      menuItem('Credits & Licenses', null, () => this.ctx.push(new CreditsScreen(this.ctx)), { key: 'credits' }));

    this.el.replaceChildren(
      h('div.t-vline'),
      h('div.t-node', { style: 'top:26.5%' }), h('div.t-hline', { style: 'top:26.5%' }),
      h('div.t-node', { style: 'top:64%' }), h('div.t-hline', { style: 'top:64%' }),
      h('div.t-brand', null,
        h('div.t-pre', null, 'BELLS OF THE'),
        h('div.t-main', null, 'UNLIVED'),
        h('div.t-tag', null, 'You remember the catastrophe, but every life you save changes the future you know.')),
      h('div.t-menu', { style: 'top:28.5%;height:33.5%' }, menu),
      h('div.t-foot', null,
        this.ctx.prompts([{ nav: 'confirm', label: 'Select' }]),
        h('div.t-ver', null, 'Ashbridge · a chronicle in progress')),
    );
  }

  private async newJourney(hasSave: boolean): Promise<void> {
    if (hasSave) {
      const ok = await this.ctx.confirm('Begin a New Journey?', 'Your current chronicle will be overwritten when the new one is first saved.', 'Begin', 'Cancel');
      if (!ok) return;
    }
    // New Journey → origin selection → host.newGame(origin). The game plays the intro from there.
    const id = await this.ctx.originSelect();
    if (id) this.ctx.host.newGame(id);
  }

  // The title has nothing to go back to.
  protected override onBack(): void {}
  protected override onPause(): void {}
}

/** Credits & third-party licences. */
export class CreditsScreen extends Screen {
  override hud = 'hidden' as const;
  constructor(ctx: UICtx) { super(ctx, 'opaque'); }

  render(): void {
    const lic = (name: string, license: string, note: string) => h('li', null, `${name} — ${license} `, h('span', null, note));
    const back = menuItem('Back', 'leave', () => this.onBack(), { key: 'back' });
    this.el.replaceChildren(
      h('div.scr-head', null, h('div.scr-title', null, 'Credits & Licenses')),
      h('div.rule', { style: 'margin-top:0.9rem' }),
      h('div.credits.panel', { style: 'margin-top:1.4rem;flex:1;min-height:0' },
        h('div', { style: 'display:flex;gap:1.2rem;align-items:center' },
          h('div', { style: 'width:4.4rem;height:6rem;color:var(--gold)', html: icon('arms_royal') }),
          h('div', null, h('div.panel-title', null, 'Bells of the Unlived'), h('div.panel-sub', null, 'A single-player chronicle of Ashbridge.'))),
        h('h3', null, 'Original work'),
        h('p', null, 'All art, animation and audio: original procedural work — drawn, modelled and synthesised in code for this game.'),
        h('h3', null, 'Engine libraries'),
        h('ul', null,
          lic('three.js', 'MIT License', '© three.js authors'),
          lic('three-mesh-bvh', 'MIT License', '© Garrett Johnson')),
        h('h3', null, 'Typefaces'),
        h('ul', null,
          lic('Cinzel', 'SIL Open Font License 1.1', '© Natanael Gama'),
          lic('Cormorant Garamond', 'SIL Open Font License 1.1', '© Christian Thalmann (Catharsis Fonts)')),
        h('p', { style: 'margin-top:1.2rem;color:var(--text-dim);font-style:italic' }, 'Full licence texts ship with the game in docs/LICENSES.md.'),
        h('div', { style: 'margin-top:1.4rem;width:14rem' }, back)),
      h('div.scr-foot', { style: 'margin-top:1rem' }, h('div.help'), this.ctx.prompts([{ nav: 'back', label: 'Back', onClick: () => this.onBack() }])),
    );
  }
}
