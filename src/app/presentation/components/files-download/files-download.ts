import { Component, input } from '@angular/core';

@Component({
  selector: 'app-files-download',
  imports: [],
  templateUrl: './files-download.html',
  styles: `
    .files-download__title {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 1rem;
    }

    .files-download__links {
      display: grid;
      gap: 0.5rem;
    }

    .files-download--horizontal {
      display: flex;
      align-items: center;
      gap: 1rem;
      min-width: 0;
    }

    .files-download--horizontal .files-download__title {
      flex: 0 0 auto;
      margin: 0;
      font-size: 0.82rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .files-download--horizontal .files-download__links {
      display: flex;
      flex: 1 1 auto;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    @media (max-width: 575.98px) {
      .files-download--horizontal {
        align-items: stretch;
        flex-direction: column;
        gap: 0.5rem;
      }

      .files-download--horizontal .files-download__links {
        display: grid;
      }
    }
  `,
})
export class FilesDownload {
  data = input.required<{
    label: string, url: string
  }[]>()
  horizontal = input(false);
}
