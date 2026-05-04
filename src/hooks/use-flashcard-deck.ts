import { useCallback, useEffect, useState } from "react";

export type Card = {
  id: string;
  question: string;
  answer: string;
  tag: string;
  topic: string;
  topicEmoji?: string;
  createdAt: number;
  interval: number;
  dueAt: number;
  lastReviewed: number | null;
  reviewCount: number;
};

const STORAGE_KEY = "studybuddy_decks_v1";
const DECK_CHANGE_EVENT = "studybuddy:deck-changed";
const PROGRESSION = [1, 3, 7, 21, 60];
const DAY = 24 * 60 * 60 * 1000;

function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & 0xffffffff;
  }
  return (hash >>> 0).toString(36);
}

export function makeCardId(question: string, answer: string): string {
  return djb2(question.trim().toLowerCase() + "|" + answer.trim().toLowerCase());
}

function loadCards(): Card[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(cards: Card[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  } catch {
    // ignore
  }
}

type NewCardInput = Pick<Card, "question" | "answer" | "tag" | "topic" | "topicEmoji">;

export function useFlashcardDeck() {
  const [allCards, setAllCards] = useState<Card[]>(() => loadCards());

  useEffect(() => {
    const refresh = () => setAllCards(loadCards());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    const onDeckChange = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener(DECK_CHANGE_EVENT, onDeckChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(DECK_CHANGE_EVENT, onDeckChange);
    };
  }, []);

  const persist = useCallback((next: Card[]) => {
    setAllCards(next);
    saveToStorage(next);
    try {
      window.dispatchEvent(new CustomEvent(DECK_CHANGE_EVENT));
    } catch {
      // ignore
    }
  }, []);

  const saveCards = useCallback(
    (incoming: NewCardInput[]): number => {
      const current = loadCards();
      const existingIds = new Set(current.map((c) => c.id));
      const now = Date.now();
      let added = 0;
      const additions: Card[] = [];
      for (const c of incoming) {
        const id = makeCardId(c.question, c.answer);
        if (existingIds.has(id)) continue;
        existingIds.add(id);
        additions.push({
          id,
          question: c.question,
          answer: c.answer,
          tag: c.tag,
          topic: c.topic,
          topicEmoji: c.topicEmoji,
          createdAt: now,
          interval: 0,
          dueAt: now,
          lastReviewed: null,
          reviewCount: 0,
        });
        added++;
      }
      if (additions.length) persist([...current, ...additions]);
      return added;
    },
    [persist]
  );

  const reviewCard = useCallback(
    (id: string, rating: "again" | "good" | "easy") => {
      const current = loadCards();
      const now = Date.now();
      const next = current.map((c) => {
        if (c.id !== id) return c;
        let interval = c.interval;
        let dueAt = c.dueAt;
        if (rating === "again") {
          interval = 0;
          dueAt = now + 10 * 60 * 1000;
        } else {
          // find current step index
          const idx = PROGRESSION.indexOf(interval);
          let nextIdx: number;
          if (interval === 0) {
            nextIdx = rating === "easy" ? 1 : 0;
          } else if (idx === -1) {
            nextIdx = 0;
          } else {
            nextIdx = rating === "easy" ? Math.min(idx + 2, PROGRESSION.length - 1) : Math.min(idx + 1, PROGRESSION.length - 1);
          }
          interval = PROGRESSION[nextIdx];
          dueAt = now + interval * DAY;
        }
        return {
          ...c,
          interval,
          dueAt,
          lastReviewed: now,
          reviewCount: c.reviewCount + 1,
        };
      });
      persist(next);
    },
    [persist]
  );

  const deleteCard = useCallback(
    (id: string) => {
      persist(loadCards().filter((c) => c.id !== id));
    },
    [persist]
  );

  const now = Date.now();
  const dueCards = allCards.filter((c) => c.dueAt <= now);
  const stats = {
    total: allCards.length,
    due: dueCards.length,
    mastered: allCards.filter((c) => c.interval >= 21).length,
  };

  return { allCards, dueCards, saveCards, reviewCard, deleteCard, stats };
}