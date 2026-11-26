import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ClipboardWriter } from '../../services/clipboard-writer';
import { LandingCodeBlockComponent, cmd, codeLines, comment, out } from './code-block.component';

describe('LandingCodeBlockComponent', () => {
  let write: jasmine.Spy;

  function render(
    lines = codeLines('$ quran-cli add x', 'Updated lockfile', '# note'),
    snippet = false
  ) {
    write = jasmine.createSpy('write').and.resolveTo(true);
    TestBed.configureTestingModule({
      imports: [LandingCodeBlockComponent, TranslateModule.forRoot()],
      providers: [{ provide: ClipboardWriter, useValue: { write } }],
    });
    const fixture = TestBed.createComponent(LandingCodeBlockComponent);
    fixture.componentRef.setInput('lines', lines);
    fixture.componentRef.setInput('copyable', true);
    fixture.componentRef.setInput('snippet', snippet);
    fixture.detectChanges();
    return fixture;
  }

  it('reads a transcript: $ is a command, # a comment, the rest output', () => {
    expect(codeLines('$ a', '# b', 'c').map((l) => l.kind)).toEqual(['cmd', 'comment', 'out']);
  });

  it('copies only the commands, without the $ prompt', async () => {
    const fixture = render();

    await fixture.componentInstance.copy();

    expect(write).toHaveBeenCalledOnceWith('quran-cli add x');
    expect(fixture.componentInstance.copyState()).toBe('copied');
  });

  it('copies a whole snippet except comments', async () => {
    const fixture = render([comment('# file'), out('a = 1'), cmd('run')], true);

    await fixture.componentInstance.copy();

    expect(write).toHaveBeenCalledOnceWith('a = 1\nrun');
  });
});
