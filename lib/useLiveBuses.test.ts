import { afterEach,expect,it,vi } from "vitest";
import { useLiveBusesStore } from "./useLiveBuses";
import { createMetrobusMock } from "./metrobus-mock";
afterEach(()=>{useLiveBusesStore.getState().clear();vi.unstubAllGlobals();});
it("replaces the previous route instance snapshot on initialization",()=>{
  const old=createMetrobusMock(1793840000000),fresh=createMetrobusMock(1793840012000);
  useLiveBusesStore.getState().initialize(old);useLiveBusesStore.getState().initialize(fresh);
  expect(useLiveBusesStore.getState().fleet).toEqual(fresh);expect(useLiveBusesStore.getState().calls).toBe(0);
});
it("does not publish a stale response after a new dashboard instance mounts",async()=>{
  const old=createMetrobusMock(1793840000000),fresh=createMetrobusMock(1793840012000);
  let resolveOld:(r:Response)=>void=()=>{};
  const firstResponse=new Promise<Response>(resolve=>{resolveOld=resolve;});
  vi.stubGlobal("fetch",vi.fn().mockReturnValueOnce(firstResponse).mockResolvedValueOnce(new Response(JSON.stringify(fresh),{status:200,headers:{"content-type":"application/json"}})));
  useLiveBusesStore.getState().initialize(old);const oldRequest=useLiveBusesStore.getState().refresh();
  useLiveBusesStore.getState().initialize(fresh);await useLiveBusesStore.getState().refresh();
  resolveOld(new Response(JSON.stringify(old),{status:200}));await oldRequest;
  expect(useLiveBusesStore.getState().fleet).toEqual(fresh);expect(useLiveBusesStore.getState().calls).toBe(1);
});
