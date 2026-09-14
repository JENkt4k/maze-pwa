import type { MousePhysics } from './micromouse';

export type MouseProfileId='explorer'|'balanced'|'sprint';
export type MouseMotion=Pick<MousePhysics,'maxSpeedMps'|'accelerationMps2'|'turn90Ms'>;
export const MOUSE_PROFILES:Readonly<Record<MouseProfileId,Readonly<{name:string;description:string;motion:MouseMotion}>>>={
  explorer:{name:'Explorer',description:'Slower, conservative motion for watching the search.',motion:{maxSpeedMps:.75,accelerationMps2:2,turn90Ms:140}},
  balanced:{name:'Balanced',description:'General-purpose simplified Micromouse motion.',motion:{maxSpeedMps:1.5,accelerationMps2:4,turn90Ms:90}},
  sprint:{name:'Sprint',description:'Fast competition-style motion with sharper turns.',motion:{maxSpeedMps:3,accelerationMps2:10,turn90Ms:45}},
};

export function matchingMouseProfile(motion:MouseMotion):MouseProfileId|'custom'{
  return (Object.entries(MOUSE_PROFILES) as [MouseProfileId,(typeof MOUSE_PROFILES)[MouseProfileId]][]).find(([,profile])=>
    profile.motion.maxSpeedMps===motion.maxSpeedMps&&profile.motion.accelerationMps2===motion.accelerationMps2&&profile.motion.turn90Ms===motion.turn90Ms,
  )?.[0]??'custom';
}
