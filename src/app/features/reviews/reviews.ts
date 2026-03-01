import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-reviews',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block py-16 bg-slate-50' },
  template: `
    <section aria-labelledby="reviews-heading" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 id="reviews-heading" class="text-3xl font-bold text-center text-slate-800 mb-12">
        Ce que disent mes clients
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Review Card 1 -->
        <article
          class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 relative group hover:shadow-md transition-shadow"
        >
          <div class="text-brand-400 mb-4 flex">
            <app-icon name="star-filled" size="md" [filled]="true" />
            <app-icon name="star-filled" size="md" [filled]="true" />
            <app-icon name="star-filled" size="md" [filled]="true" />
            <app-icon name="star-filled" size="md" [filled]="true" />
            <app-icon name="star-filled" size="md" [filled]="true" />
          </div>
          <p class="text-slate-600 mb-6 italic">
            "Un accompagnement exceptionnel. J'ai pu dépasser mes blocages professionnels en
            quelques séances. Je recommande vivement !"
          </p>
          <div class="flex items-center gap-4">
            <div
              class="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-semibold"
            >
              S
            </div>
            <div>
              <h4 class="font-semibold text-slate-800">Sophie L.</h4>
              <p class="text-sm text-slate-500">Coaching de Vie</p>
            </div>
          </div>
        </article>

        <!-- Review Card 2 -->
        <article
          class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 relative group hover:shadow-md transition-shadow"
        >
          <div class="text-brand-400 mb-4 flex">
            <app-icon name="star-filled" size="md" [filled]="true" />
            <app-icon name="star-filled" size="md" [filled]="true" />
            <app-icon name="star-filled" size="md" [filled]="true" />
            <app-icon name="star-filled" size="md" [filled]="true" />
            <app-icon name="star-filled" size="md" [filled]="true" class="text-slate-200" />
          </div>
          <p class="text-slate-600 mb-6 italic">
            "L'équicoaching a été une révélation. Comprendre mes émotions à travers la réaction du
            cheval m'a beaucoup aidé en tant que manager."
          </p>
          <div class="flex items-center gap-4">
            <div
              class="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-semibold"
            >
              T
            </div>
            <div>
              <h4 class="font-semibold text-slate-800">Thomas M.</h4>
              <p class="text-sm text-slate-500">Coaching Equin</p>
            </div>
          </div>
        </article>

        <!-- Review Card 3 -->
        <article
          class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 relative group hover:shadow-md transition-shadow"
        >
          <div class="text-brand-400 mb-4 flex">
            <app-icon name="star-filled" size="md" [filled]="true" />
            <app-icon name="star-filled" size="md" [filled]="true" />
            <app-icon name="star-filled" size="md" [filled]="true" />
            <app-icon name="star-filled" size="md" [filled]="true" />
            <app-icon name="star-filled" size="md" [filled]="true" />
          </div>
          <p class="text-slate-600 mb-6 italic">
            "Enfin une personne qui comprend vraiment ma réalité de maman d'un enfant TDAH. Un grand
            soutien sans jugement."
          </p>
          <div class="flex items-center gap-4">
            <div
              class="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-semibold"
            >
              C
            </div>
            <div>
              <h4 class="font-semibold text-slate-800">Claire D.</h4>
              <p class="text-sm text-slate-500">Aide Parents</p>
            </div>
          </div>
        </article>
      </div>

      <div class="mt-12 text-center">
        <a
          href="https://g.page/r/your-google-business-link"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 text-brand-700 font-medium hover:text-brand-800 transition-colors"
        >
          Voir tous les avis sur Google
          <app-icon name="arrow-right" size="sm" />
        </a>
      </div>
    </section>
    <!-- Removed wrapper div -->
  `,
})
export class Reviews {}
