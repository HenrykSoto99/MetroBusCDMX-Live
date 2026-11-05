import { expect,it } from "vitest";
import { createMetrobusMock,updateMetrobusPositions,MOCK_LINE_COUNTS } from "./metrobus-mock";
it("distributes exactly 100 simulated units across all seven GTFS corridors",()=>{
  const fleet=createMetrobusMock(1793840000000);
  expect(fleet.vehicles).toHaveLength(100);
  expect(new Set(fleet.vehicles.map(v=>v.line_id)).size).toBe(7);
  for(const [id,count] of Object.entries(MOCK_LINE_COUNTS))expect(fleet.vehicles.filter(v=>v.line_id===Number(id))).toHaveLength(count);
  expect(fleet.source).toBe("simulation");expect(fleet.external_api_calls).toBe(0);
});
it("shares a snapshot within each 12-second bucket and moves at the next bucket",()=>{
  const time=Math.floor(1793840000000/12000)*12000;
  const a=updateMetrobusPositions(time),b=updateMetrobusPositions(time+1000),c=updateMetrobusPositions(time+12000);
  expect(a).toEqual(b);expect(c.vehicles[0].latitude).not.toBe(a.vehicles[0].latitude);
});
