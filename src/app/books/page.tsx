import {
  BookOpen,
  Feather,
  Flame,
  HardDrive,
  LayoutGrid,
  MoreHorizontal,
  PenLine,
  Plus,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Your books",
  description: "A private, local-first library for your novels and works in progress.",
};

const books = [
  {
    title: "The Long Way Home",
    genre: "Literary fiction",
    words: "42,680",
    target: "80,000",
    chapters: 12,
    progress: 53,
    updated: "2 hours ago",
    coverClass: "from-[#313c33] via-[#54604a] to-[#a7af90]",
    accentClass: "bg-[#d9dfcd] text-[#4d5944]",
    roman: "I",
  },
  {
    title: "Saltwater Static",
    genre: "Mystery",
    words: "18,240",
    target: "65,000",
    chapters: 6,
    progress: 28,
    updated: "Yesterday",
    coverClass: "from-[#24404b] via-[#56717a] to-[#b8c9c7]",
    accentClass: "bg-[#d8e4e3] text-[#48656c]",
    roman: "II",
  },
  {
    title: "Paper Moons",
    genre: "Romance",
    words: "71,010",
    target: "75,000",
    chapters: 22,
    progress: 95,
    updated: "3 days ago",
    coverClass: "from-[#6b4847] via-[#9a6f69] to-[#dcc0ae]",
    accentClass: "bg-[#f0dfd6] text-[#875f5d]",
    roman: "III",
  },
  {
    title: "Wildlight Orchard",
    genre: "Fantasy",
    words: "4,890",
    target: "90,000",
    chapters: 3,
    progress: 5,
    updated: "6 days ago",
    coverClass: "from-[#4a3e32] via-[#796950] to-[#cbb98c]",
    accentClass: "bg-[#e8dfc9] text-[#756246]",
    roman: "IV",
  },
];

const navItems = [
  { icon: LayoutGrid, label: "My books", active: true },
  { icon: Sparkles, label: "Writing goals", active: false },
  { icon: Settings, label: "Settings", active: false },
];

export default function BooksPage() {
  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#282923]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[#282923]/8 bg-[#eeede7] px-5 py-6 lg:flex">
          <Link
            className="flex items-center gap-2.5 px-2 font-heading text-xl font-semibold tracking-tight"
            href="/"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-[#2d3029] text-white shadow-[0_6px_16px_rgba(45,48,41,0.16)]">
              <Feather aria-hidden="true" className="size-4.5" />
            </span>
            awthor
          </Link>

          <nav aria-label="Workspace" className="mt-10 space-y-1.5">
            {navItems.map((item) => (
              <a
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                  item.active
                    ? "bg-[#dce2d0] text-[#3e4937]"
                    : "text-[#74746d] hover:bg-white/60 hover:text-[#36372f]"
                }`}
                href={item.active ? "#books" : "#"}
                key={item.label}
              >
                <item.icon aria-hidden="true" className="size-4.5" />
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-[#282923]/8 bg-[#f8f7f3] p-4 shadow-[0_10px_30px_rgba(45,48,41,0.05)]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-extrabold text-[#55584e]">
                <Flame aria-hidden="true" className="size-4 text-[#b87954]" />
                Today&apos;s goal
              </span>
              <span className="text-xs font-bold text-[#7c7d74]">682 / 800</span>
            </div>
            <div
              aria-label="Daily writing goal: 85% complete"
              aria-valuemax={800}
              aria-valuemin={0}
              aria-valuenow={682}
              className="mt-3 h-2 overflow-hidden rounded-full bg-[#e5e3dc]"
              role="progressbar"
            >
              <div className="h-full w-[85%] rounded-full bg-[#809066]" />
            </div>
            <p className="mt-3 text-xs leading-5 text-[#85857d]">
              118 words to keep your 6-day streak alive.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="grid size-9 place-items-center rounded-full bg-[#30332c] text-xs font-extrabold text-white">
              AP
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">Alex Parker</p>
              <p className="truncate text-xs text-[#8a8a82]">Local workspace</p>
            </div>
            <MoreHorizontal aria-hidden="true" className="ml-auto size-4 text-[#8a8a82]" />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex h-18 items-center justify-between border-b border-[#282923]/8 bg-[#f8f7f3]/90 px-5 backdrop-blur sm:px-8 lg:px-10">
            <Link
              aria-label="Awthor home"
              className="flex items-center gap-2 font-heading text-lg font-semibold lg:hidden"
              href="/"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-[#2d3029] text-white">
                <Feather aria-hidden="true" className="size-4" />
              </span>
              awthor
            </Link>
            <div className="relative hidden w-full max-w-sm sm:block">
              <Search
                aria-hidden="true"
                className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#9a9a92]"
              />
              <label className="sr-only" htmlFor="book-search">
                Search your books
              </label>
              <input
                className="h-10 w-full rounded-xl border border-[#282923]/8 bg-white/70 pr-4 pl-10 text-sm outline-none placeholder:text-[#aaa9a2] focus:border-[#879374]/50 focus:ring-3 focus:ring-[#879374]/10"
                id="book-search"
                placeholder="Search books, chapters, notes..."
                type="search"
              />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden items-center gap-1.5 text-xs font-bold text-[#8a8a82] sm:flex">
                <HardDrive aria-hidden="true" className="size-3.5" />
                Saved on this device
              </span>
              <div className="grid size-9 place-items-center rounded-full bg-[#30332c] text-xs font-extrabold text-white lg:hidden">
                AP
              </div>
            </div>
          </header>

          <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
            <section className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#7c8867]">
                  Friday, August 28
                </p>
                <h1 className="mt-2 font-heading text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                  Your books
                </h1>
                <p className="mt-2 text-sm text-[#7e7e76] sm:text-base">
                  Pick up where you left off, or begin something new.
                </p>
              </div>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-[#2d3029] px-4 text-sm font-bold text-white shadow-[0_8px_22px_rgba(45,48,41,0.16)] transition hover:-translate-y-0.5 hover:bg-[#41463b] sm:self-auto"
                type="button"
              >
                <Plus aria-hidden="true" className="size-4" />
                New book
              </button>
            </section>

            <section className="mt-8 grid gap-3 sm:grid-cols-3" aria-label="Writing summary">
              <div className="rounded-2xl border border-[#282923]/8 bg-[#fbfaf7] px-5 py-4">
                <p className="text-xs font-bold text-[#8a8a82]">Total words</p>
                <p className="mt-1 font-heading text-2xl font-semibold tracking-tight">136,820</p>
              </div>
              <div className="rounded-2xl border border-[#282923]/8 bg-[#fbfaf7] px-5 py-4">
                <p className="text-xs font-bold text-[#8a8a82]">Writing streak</p>
                <p className="mt-1 flex items-center gap-2 font-heading text-2xl font-semibold tracking-tight">
                  6 days
                  <Flame aria-hidden="true" className="size-5 text-[#b87954]" />
                </p>
              </div>
              <div className="rounded-2xl border border-[#282923]/8 bg-[#fbfaf7] px-5 py-4">
                <p className="text-xs font-bold text-[#8a8a82]">Books in progress</p>
                <p className="mt-1 font-heading text-2xl font-semibold tracking-tight">4</p>
              </div>
            </section>

            <section className="mt-10" id="books">
              <div className="flex items-center justify-between border-b border-[#282923]/8">
                <div className="flex gap-6 text-sm font-bold">
                  <button
                    className="border-b-2 border-[#536047] px-0.5 pb-3 text-[#394033]"
                    type="button"
                  >
                    All books
                  </button>
                  <button className="px-0.5 pb-3 text-[#96958d]" type="button">
                    Drafts
                  </button>
                  <button className="hidden px-0.5 pb-3 text-[#96958d] sm:block" type="button">
                    Completed
                  </button>
                </div>
                <span className="pb-3 text-xs font-bold text-[#9a9991]">4 books</span>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {books.map((book) => (
                  <article
                    className="group overflow-hidden rounded-[1.4rem] border border-[#282923]/8 bg-[#fbfaf7] shadow-[0_10px_32px_rgba(45,48,41,0.05)] transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(45,48,41,0.1)]"
                    key={book.title}
                  >
                    <div
                      className={`relative h-48 overflow-hidden bg-gradient-to-br ${book.coverClass}`}
                    >
                      <div
                        aria-hidden="true"
                        className="absolute -top-10 -right-12 size-40 rounded-full border border-white/18"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute -right-3 -bottom-18 size-40 rounded-full bg-white/9 blur-xl"
                      />
                      <div className="absolute inset-0 flex flex-col justify-between p-5 text-white">
                        <span className="font-serif text-xs tracking-[0.22em] text-white/65">
                          {book.roman}
                        </span>
                        <div>
                          <BookOpen aria-hidden="true" className="mb-3 size-5 text-white/60" />
                          <p className="max-w-[12rem] font-heading text-2xl leading-7 font-semibold tracking-tight">
                            {book.title}
                          </p>
                        </div>
                      </div>
                      <button
                        aria-label={`More options for ${book.title}`}
                        className="absolute top-4 right-4 grid size-8 place-items-center rounded-full bg-black/15 text-white backdrop-blur transition hover:bg-black/25"
                        type="button"
                      >
                        <MoreHorizontal aria-hidden="true" className="size-4" />
                      </button>
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h2 className="truncate font-heading text-lg font-semibold tracking-tight">
                            {book.title}
                          </h2>
                          <p className="mt-1 text-xs font-semibold text-[#8d8c84]">{book.genre}</p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${book.accentClass}`}
                        >
                          {book.progress}%
                        </span>
                      </div>

                      <div
                        aria-label={`${book.title}: ${book.progress}% complete`}
                        aria-valuemax={100}
                        aria-valuemin={0}
                        aria-valuenow={book.progress}
                        className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#e8e6df]"
                        role="progressbar"
                      >
                        <div
                          className="h-full rounded-full bg-[#7e8b68]"
                          style={{ width: `${book.progress}%` }}
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-[#96958d]">
                        <span>
                          {book.words} / {book.target} words
                        </span>
                        <span>{book.chapters} chapters</span>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-[#282923]/7 pt-4">
                        <span className="text-[11px] font-semibold text-[#a09f97]">
                          Edited {book.updated}
                        </span>
                        <button
                          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#536047] transition group-hover:gap-2"
                          type="button"
                        >
                          <PenLine aria-hidden="true" className="size-3.5" />
                          Continue
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
