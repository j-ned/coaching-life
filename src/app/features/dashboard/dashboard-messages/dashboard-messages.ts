import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { GetMessagesUseCase } from '../../contact/domain/use-cases/get-messages.use-case';
import { UpdateMessageStatusUseCase } from '../../contact/domain/use-cases/update-message-status.use-case';
import { DeleteMessageUseCase } from '../../contact/domain/use-cases/delete-message.use-case';
import {
  MESSAGE_SUBJECT_LABELS,
  type Message,
  type MessageStatus,
} from '../../contact/domain/models/message.model';
import { DatePipe } from '@angular/common';
import { Icon } from '../../../shared/components/icon/icon';

type FilterTab = 'all' | MessageStatus;

const FILTER_TABS: readonly { readonly key: FilterTab; readonly label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'unread', label: 'Non lus' },
  { key: 'read', label: 'Lus' },
  { key: 'archived', label: 'Archivés' },
];

@Component({
  selector: 'app-dashboard-messages',
  imports: [DatePipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col h-full' },
  template: `
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-medium text-slate-800">Boîte de réception</h2>
      <div class="flex items-center gap-2 text-sm">
        @if (unreadCount() > 0) {
          <span class="bg-brand-100 text-brand-700 px-2.5 py-0.5 rounded-full font-medium">
            {{ unreadCount() }} non lu{{ unreadCount() > 1 ? 's' : '' }}
          </span>
        }
      </div>
    </div>

    <!-- Filter tabs -->
    <nav
      class="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1 w-fit"
      aria-label="Filtrer les messages"
    >
      @for (tab of tabs; track tab.key) {
        <button
          type="button"
          (click)="activeFilter.set(tab.key)"
          [class.bg-white]="activeFilter() === tab.key"
          [class.shadow-sm]="activeFilter() === tab.key"
          [class.text-slate-800]="activeFilter() === tab.key"
          [class.font-medium]="activeFilter() === tab.key"
          [class.text-slate-500]="activeFilter() !== tab.key"
          class="px-4 py-2 rounded-md text-sm transition-all"
          [attr.aria-pressed]="activeFilter() === tab.key"
        >
          {{ tab.label }}
          @if (tab.key === 'unread' && unreadCount() > 0) {
            <span class="ml-1.5 bg-brand-500 text-white text-xs px-1.5 py-0.5 rounded-full">{{
              unreadCount()
            }}</span>
          }
        </button>
      }
    </nav>

    <div
      class="bg-white rounded-xl shadow-sm border border-slate-100 grow flex overflow-hidden min-h-[500px]"
    >
      <!-- Sidebar: Message List -->
      <div class="w-1/3 border-r border-slate-100 overflow-y-auto">
        @if (filteredMessages().length === 0) {
          <div class="p-8 text-center text-slate-400">
            <svg
              class="w-12 h-12 mx-auto mb-3 text-slate-200"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              aria-hidden="true"
            >
              <use href="icons/sprite.svg#mail" />
            </svg>
            <p class="text-sm">Aucun message</p>
          </div>
        } @else {
          <div class="divide-y divide-slate-100">
            @for (msg of filteredMessages(); track msg.id) {
              <button
                type="button"
                class="w-full p-4 text-left hover:bg-slate-50 cursor-pointer transition-colors relative"
                [class.bg-brand-50]="selectedMessage()?.id === msg.id"
                (click)="selectMessage(msg)"
              >
                @if (msg.status === 'unread') {
                  <div class="absolute w-2.5 h-2.5 bg-brand-500 rounded-full top-5 right-4"></div>
                }
                @if (msg.status === 'archived') {
                  <div class="absolute top-5 right-4">
                    <app-icon name="archive" size="sm" class="text-slate-400" />
                  </div>
                }
                <p
                  class="font-medium text-slate-800 pr-6 truncate"
                  [class.font-bold]="msg.status === 'unread'"
                >
                  {{ msg.senderName }}
                </p>
                <p
                  class="text-sm text-slate-600 truncate mb-1"
                  [class.font-semibold]="msg.status === 'unread'"
                >
                  {{ subjectLabel(msg.subject) }}
                </p>
                <p class="text-xs text-slate-500 truncate pr-12">{{ msg.content }}</p>
                <time
                  class="text-[10px] text-slate-400 absolute bottom-4 right-4"
                  [attr.datetime]="msg.createdAt"
                  >{{ msg.createdAt | date: 'dd/MM/yy HH:mm' }}</time
                >
              </button>
            }
          </div>
        }
      </div>

      <!-- Main Area: Message Details -->
      <div class="w-2/3 flex flex-col bg-slate-50/50">
        @if (selectedMessage(); as msg) {
          <div class="p-6 border-b border-slate-100 bg-white">
            <div class="flex justify-between items-start mb-3">
              <div>
                <h3 class="text-lg font-medium text-slate-800">{{ subjectLabel(msg.subject) }}</h3>
                <p class="text-sm text-slate-500">
                  De <span class="font-medium text-slate-700">{{ msg.senderName }}</span> &lt;{{
                    msg.senderEmail
                  }}&gt;
                </p>
              </div>
              <time class="text-sm text-slate-500 shrink-0" [attr.datetime]="msg.createdAt">{{
                msg.createdAt | date: 'dd MMM yyyy à HH:mm'
              }}</time>
            </div>

            <!-- Actions -->
            <div class="flex gap-2 mt-3">
              @if (msg.status !== 'unread') {
                <button
                  type="button"
                  (click)="changeStatus(msg.id, 'unread')"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <app-icon name="info" size="xs" />
                  Marquer non lu
                </button>
              }
              @if (msg.status !== 'read') {
                <button
                  type="button"
                  (click)="changeStatus(msg.id, 'read')"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <app-icon name="check" size="xs" />
                  Marquer lu
                </button>
              }
              @if (msg.status !== 'archived') {
                <button
                  type="button"
                  (click)="changeStatus(msg.id, 'archived')"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <app-icon name="archive" size="xs" />
                  Archiver
                </button>
              }

              <div class="ml-auto">
                @if (confirmDeleteId() === msg.id) {
                  <span class="text-xs text-red-600 mr-2">Confirmer ?</span>
                  <button
                    type="button"
                    (click)="deleteMessage(msg.id)"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    Oui, supprimer
                  </button>
                  <button
                    type="button"
                    (click)="confirmDeleteId.set(null)"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors ml-1"
                  >
                    Annuler
                  </button>
                } @else {
                  <button
                    type="button"
                    (click)="confirmDeleteId.set(msg.id)"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <app-icon name="trash-2" size="xs" />
                    Supprimer
                  </button>
                }
              </div>
            </div>
          </div>

          <div class="p-6 grow overflow-y-auto text-slate-700 whitespace-pre-line leading-relaxed">
            {{ msg.content }}
          </div>
        } @else {
          <div class="grow flex flex-col items-center justify-center text-slate-400">
            <svg
              class="w-16 h-16 mb-4 text-slate-200"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              aria-hidden="true"
            >
              <use href="icons/sprite.svg#mail" />
            </svg>
            <p>Sélectionnez un message pour le lire</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class DashboardMessages {
  private readonly getMessages = inject(GetMessagesUseCase);
  private readonly updateMessageStatus = inject(UpdateMessageStatusUseCase);
  private readonly deleteMessageUseCase = inject(DeleteMessageUseCase);

  protected readonly tabs = FILTER_TABS;
  protected readonly activeFilter = signal<FilterTab>('all');
  protected readonly selectedMessage = signal<Message | null>(null);
  protected readonly confirmDeleteId = signal<string | null>(null);

  private readonly _messages = signal<readonly Message[]>([]);

  protected readonly unreadCount = computed(
    () => this._messages().filter((m) => m.status === 'unread').length,
  );

  protected readonly filteredMessages = computed(() => {
    const filter = this.activeFilter();
    const messages = this._messages();
    if (filter === 'all') return messages.filter((m) => m.status !== 'archived');
    return messages.filter((m) => m.status === filter);
  });

  constructor() {
    this.loadMessages();
  }

  protected subjectLabel(subject: string): string {
    return MESSAGE_SUBJECT_LABELS[subject] ?? (subject || 'Sans sujet');
  }

  protected selectMessage(msg: Message): void {
    this.selectedMessage.set(msg);
    if (msg.status === 'unread') {
      this.changeStatus(msg.id, 'read');
    }
  }

  protected async changeStatus(id: string, status: MessageStatus): Promise<void> {
    const updated = await this.updateMessageStatus.execute(id, status);
    this._messages.update((msgs) => msgs.map((m) => (m.id === id ? updated : m)));
    if (this.selectedMessage()?.id === id) {
      this.selectedMessage.set(updated);
    }
  }

  protected async deleteMessage(id: string): Promise<void> {
    await this.deleteMessageUseCase.execute(id);
    this._messages.update((msgs) => msgs.filter((m) => m.id !== id));
    if (this.selectedMessage()?.id === id) {
      this.selectedMessage.set(null);
    }
    this.confirmDeleteId.set(null);
  }

  private async loadMessages(): Promise<void> {
    const messages = await this.getMessages.execute();
    this._messages.set(messages);
  }
}
