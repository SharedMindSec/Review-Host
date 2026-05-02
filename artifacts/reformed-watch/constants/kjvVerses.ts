export type KjvLoadingVerse = {
  ref: string;
  text: string;
};

export const KJV_LOADING_VERSES: KjvLoadingVerse[] = [
  {
    ref: "John 3:16",
    text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
  },
  {
    ref: "Psalm 23:1",
    text: "The LORD is my shepherd; I shall not want.",
  },
  {
    ref: "Romans 8:28",
    text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.",
  },
  {
    ref: "Proverbs 3:5-6",
    text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.",
  },
  {
    ref: "Isaiah 40:31",
    text: "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.",
  },
  {
    ref: "Matthew 11:28",
    text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest.",
  },
  {
    ref: "Psalm 46:1",
    text: "God is our refuge and strength, a very present help in trouble.",
  },
  {
    ref: "2 Timothy 1:7",
    text: "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.",
  },
  {
    ref: "Philippians 4:13",
    text: "I can do all things through Christ which strengtheneth me.",
  },
  {
    ref: "Psalm 119:105",
    text: "Thy word is a lamp unto my feet, and a light unto my path.",
  },
  {
    ref: "Ephesians 2:8-9",
    text: "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast.",
  },
  {
    ref: "Romans 10:9",
    text: "That if thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved.",
  },
];

export function getRandomKjvLoadingVerse() {
  return KJV_LOADING_VERSES[Math.floor(Math.random() * KJV_LOADING_VERSES.length)];
}
