import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../shared/components/icon/icon';
import { GetAllPagesUseCase } from '../../content/domain/use-cases/get-all-pages.use-case';
import { DEFAULT_PAGES } from '../../content/domain/models/default-content';
import type { PageContent, PageSlug } from '../../content/domain/models/page-content.model';

const PAGE_LABELS: Record<PageSlug, string> = {
  'life-coach': 'Coach de Vie',
  'personal-development': 'Développement Personnel',
  'equine-coaching': 'Coaching Equin',
  'neuroatypical-parents': 'Parents Neuroatypiques',
};

const PAGE_ICONS: Record<PageSlug, string> = {
  'life-coach': 'sparkles',
  'personal-development': 'book-open',
  'equine-coaching': 'smile',
  'neuroatypical-parents': 'heart',
};

const ALL_SLUGS: readonly PageSlug[] = [
  'life-coach',
  'personal-development',
  'equine-coaching',
  'neuroatypical-parents',
];

@Component({
  selector: 'app-dashboard-content',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-slate-800">Gestion du contenu</h2>
      <p class="text-slate-500 mt-1">Modifiez les textes et images de votre site.</p>
    </div>

    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Home page card -->
      <a
        routerLink="/dashboard/content/home"
        class="group bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow duration-300"
      >
        <div
          class="w-12 h-12 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center mb-4"
        >
          <app-icon name="home" size="lg" />
        </div>
        <h3 class="text-lg font-semibold text-slate-800 mb-1">Page d'accueil</h3>
        <p class="text-sm text-slate-500">Hero, services, section CTA</p>
      </a>

      <!-- Page cards -->
      @for (card of pageCards(); track card.slug) {
        <a
          [routerLink]="['/dashboard/content', card.slug]"
          class="group bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow duration-300"
        >
          <div
            class="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4"
          >
            <app-icon [name]="card.icon" size="lg" />
          </div>
          <h3 class="text-lg font-semibold text-slate-800 mb-1">{{ card.label }}</h3>
          <p class="text-sm text-slate-500">{{ card.title }}</p>
        </a>
      }
    </div>
  `,
})
export class DashboardContent {
  private readonly getAllPages = inject(GetAllPagesUseCase);
  protected readonly pages = signal<readonly PageContent[]>([]);

  protected readonly pageCards = computed(() => {
    const pages = this.pages();
    return ALL_SLUGS.map((slug) => ({
      slug,
      label: PAGE_LABELS[slug],
      icon: PAGE_ICONS[slug],
      title: pages.find((p) => p.slug === slug)?.title ?? DEFAULT_PAGES[slug].title,
    }));
  });

  constructor() {
    this.loadPages();
  }

  private async loadPages(): Promise<void> {
    const pages = await this.getAllPages.execute();
    this.pages.set(pages);
  }
}
