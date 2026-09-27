/**
 * Pause menu: side list over a dimmed world, with a character summary panel.
 */
import { h, fmtNum, fmtTime } from '../dom';
import { icon } from '../icons';
import { menuItem, Screen, type UICtx } from '../screen';
import { AttributesScreen } from './attributes';
import { EquipmentScreen } from './equipment';
import { JournalScreen } from './journal';
import { SettingsScreen } from './settings';

export class PauseScreen extends Screen {
  private help = h('div.help');

  constructor(ctx: UICtx) { super(ctx, 'side'); }

  render(): void {
    const c = this.ctx;
    const host = c.host;
    const sheet = host.sheet();
    const save = host.saveSummary();
    const menu = h('div.menu', { 'data-nav-wrap': '' },
      menuItem('Resume', 'resume', () => this.resume(), { key: 'resume', help: 'Return to the world.' }),
      menuItem('Equipment', 'equipment', () => c.push(new EquipmentScreen(c, 'equipment')), { key: 'equipment', help: 'Arms, armour, talismans and quick items.' }),
      menuItem('Inventory', 'inventory', () => c.push(new EquipmentScreen(c, 'inventory')), { key: 'inventory', help: 'Everything you carry.' }),
      menuItem('Status', 'status', () => c.push(new AttributesScreen(c, true)), { key: 'status', help: 'Attributes and derived statistics. Change them at a Stillbell.' }),
      menuItem('Forememory', 'journal', () => c.push(new JournalScreen(c, 'leads')), { key: 'journal', help: 'Your journal: what you remember, what you observe, what you have changed.' }),
      menuItem('Practice', 'practice', () => c.push(new JournalScreen(c, 'practice')), { key: 'practice', help: 'The rules of combat, as the practice-yard plaques state them.' }),
      menuItem('Settings', 'settings', () => c.push(new SettingsScreen(c)), { key: 'settings', help: 'Graphics, audio, gameplay, accessibility and controls.' }),
      menuItem('Quit to Title', 'quit', () => void this.quit(), { key: 'quit', help: 'Your progress is saved first.' }));
    menu.firstElementChild?.setAttribute('data-nav-default', '');

    const kv = h('div.kv');
    const row = (ic: string, k: string, v: string) => kv.append(h('span.k', null, h('span.icw', { html: icon(ic) }), k), h('span.v', null, v));
    row('level', 'Level', String(sheet.level));
    row('hours', 'Hours held', fmtNum(sheet.hours));
    row('stat_hp', 'Health', String(sheet.hpMax));
    row('stat_focus', 'Focus', String(sheet.focusMax));
    row('stat_stamina', 'Stamina', String(sheet.staminaMax));
    row('stat_load', 'Equip load', `${sheet.equipLoad.toFixed(1)} / ${sheet.equipLoadMax.toFixed(1)}`);
    row('travel', 'Time in Ashbridge', fmtTime(host.playtime()));

    this.el.replaceChildren(
      h('div.scr-head', null, h('div.scr-title', null, 'Paused'), save ? h('div.scr-sub', null, save.location) : null),
      h('div.rule', { style: 'margin-top:0.9rem;width:40rem' }),
      h('div.scr-body', null,
        h('div.side-menu', null, menu),
        h('div.side-info', null,
          h('div.panel', { style: 'padding:1.4rem 1.8rem' },
            h('div', { style: 'display:flex;gap:1rem;align-items:center;margin-bottom:0.9rem' },
              h('div.portrait', { html: icon(`origin_${sheet.originId}`), style: 'flex:none' }),
              h('div', null, h('div.panel-title', null, 'The Returned'), h('div.panel-sub', null, save?.origin ?? ''))),
            kv))),
      h('div.scr-foot', null, this.help, this.ctx.prompts([
        { nav: 'confirm', label: 'Select' }, { nav: 'back', label: 'Resume', onClick: () => this.resume() }])),
    );
  }

  protected override onFocus(el: HTMLElement): void { this.help.textContent = el.getAttribute('data-help') ?? ''; }
  protected override onBack(): void { this.resume(); }

  private resume(): void {
    this.ctx.sound('ui_close');
    this.ctx.closeAll();
    this.ctx.host.resume();
  }

  private async quit(): Promise<void> {
    if (await this.ctx.confirm('Quit to Title?', 'Your progress is saved first. The world keeps what you have changed.', 'Quit', 'Stay')) {
      this.ctx.closeAll();
      this.ctx.host.quitToTitle();
    }
  }
}
