// View aliases verified against archive.json stat IDs and the exact observed text.
// Unmapped or changed source wording remains verbatim.
export const MOD_LABELS = [
    ["malevolence_damaging_ailments_you_inflict_deal_damage_faster", "Malevolence - Damaging Ailments you inflict deal Damage (10 to 15)% faster", "Malevolence · faster ailments"],
    ["malevolence_to_damage_over_time_multiplier", "Malevolence - +(18 to 22)% to Damage over Time Multiplier", "Malevolence · damage over time multiplier"],
    ["discipline_gain_energy_shield_per_enemy_hit", "Discipline - Gain (20 to 30) Energy Shield per Enemy Hit", "Discipline · energy shield on hit"],
    ["vitality_gain_life_per_enemy_hit", "Vitality - Gain (20 to 30) Life per Enemy Hit", "Vitality · life on hit"],
    ["malevolence_increased_recovery_rate_of_life_and_energy_shield", "Malevolence - (8 to 12)% increased Recovery rate of Life and Energy Shield", "Malevolence · life / energy shield recovery rate"],
    ["clarity_gain_of_maximum_mana_as_extra_maximum_energy_shield", "Clarity - Gain (6 to 10)% of Maximum Mana as Extra Maximum Energy Shield", "Clarity · max mana as extra max energy shield"],
    ["precision_to_critical_strike_multiplier", "Precision - +(20 to 30)% to Critical Strike Multiplier", "Precision · critical strike multiplier"],
    ["precision_increased_attack_damage", "Precision - (40 to 60)% increased Attack Damage", "Precision · increased attack damage"],
];
const aliases = new Map(MOD_LABELS.map(([, canonical, label]) => [canonical, label]));
export const compactMod = canonical => aliases.get(canonical) || canonical;
