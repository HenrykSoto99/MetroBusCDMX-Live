import { beforeEach, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({attempts:0}));
vi.mock("@/lib/db",()=>({getPool:()=>({getConnection:async()=>({beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},execute:async(sql:string,params?:unknown[])=>{
  if(sql.includes("INSERT INTO")){fake.attempts=fake.attempts===0?1:Math.min(fake.attempts+1,Number(params?.[3]));return[[],[]];}
  return[[{attempts:fake.attempts}],[]];
}})})}));
import { consumeRateLimit } from "./rate-limit";
beforeEach(()=>{fake.attempts=0;});
it("blocks the sixth and subsequent attempts without silently clamping at the allowed limit",async()=>{
  const allowed=[];
  for(let i=0;i<7;i++) allowed.push(await consumeRateLimit("unit-test-not-a-real-user"));
  expect(allowed).toEqual([true,true,true,true,true,false,false]);
});
