import { Mail } from 'lucide-react';
import Link from 'next/link';

interface FABProps {
  href?: string;
  /** Имя кнопки для скринридера. По умолчанию — «Contact us»: */
  ariaLabel?: string;
}

/**
 * FAB — Floating Action Button главной страницы дизайнера (`/u/[slug]`).
 *
 * Ведёт к секции контакта (`#contact` → CtaSection), т.е. это быстрый доступ
 * к email/WhatsApp, а НЕ виртуальный помощник.
 *
 * История: до 2026-09-26 здесь стояла иконка `CircleHelp` с `aria-label="Help"`,
 * что обещало несуществующего ИИ-ассистента (кнопка просто скроллила к контакту).
 * Иконка и имя приведены в соответствие с реальным поведением.
 * План по настоящему ассистенту: `Docs/roadmap/ai-assistant-fab.md`.
 *
 * Внешний вид: 64×64 (Main_page_Spec §11), фиксирован в правом нижнем углу,
 * z-50 (выше шапки z-40). Цвета — только токены (bg-secondary-fixed-dim,
 * text-on-secondary-fixed), HEX не хардкодим.
 */
export function FAB({ href = '#contact', ariaLabel = 'Contact us' }: FABProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="fixed bottom-8 right-8 z-50 inline-flex h-16 w-16 items-center justify-center rounded-tl-full rounded-tr-full rounded-bl-full rounded-br-none bg-secondary-fixed-dim shadow-lg hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Mail size={24} className="text-on-secondary-fixed" aria-hidden />
    </Link>
  );
}
