/**
 * The Study: what you learn from killing a thing many times. Ranks by lifetime kills; each rank
 * reveals more of the creature and pays a small permanent bonus that survives every fire.
 */
export const STUDY_RANKS_ENEMY = [25, 100, 500, 2000];
export const STUDY_RANKS_BOSS = [1, 4, 12, 30];
export const STUDY_RANK_NAMES = ['Unstudied', 'Noted', 'Known', 'Understood', 'Mastered'];
/** what each rank reveals in the bestiary */
export const STUDY_REVEALS = ['its lore', 'its resistances', 'its attacks and their tells', 'its drops', 'its measure: every number'];
/** permanent bonus per rank: damage and marrow, as fractions */
export const STUDY_BONUS = { enemy: 0.002, boss: 0.005 };
/** damage against that creature per rank (you know where to cut) */
export const STUDY_VS_PER_RANK = 0.03;
