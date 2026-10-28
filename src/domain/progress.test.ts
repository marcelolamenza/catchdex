import { describe,expect,it } from "vitest";
import { EMPTY,filterByGeneration,mergeProgress,normalizeProgress,updateProgress } from "./progress";
describe("progress invariants",()=>{
 it("defaults unknown species to uncaught",()=>expect(EMPTY).toEqual({caught:false,wasOnTeam:false}));
 it("team history automatically catches",()=>expect(updateProgress({},25,{wasOnTeam:true})[25]).toEqual({caught:true,wasOnTeam:true}));
 it("uncatching clears team history atomically",()=>expect(updateProgress({25:{caught:true,wasOnTeam:true}},25,{caught:false})[25]).toEqual({caught:false,wasOnTeam:false}));
 it("merges cloud and local without losing positive flags",()=>expect(mergeProgress({1:{caught:true,wasOnTeam:false}},{1:{caught:false,wasOnTeam:true},2:{caught:true,wasOnTeam:false}})).toEqual({1:{caught:true,wasOnTeam:true},2:{caught:true,wasOnTeam:false}}));
 it("normalizes malformed storage and enforces invariants",()=>expect(normalizeProgress({"2":{caught:false,wasOnTeam:true},"bad":{caught:true}})).toEqual({2:{caught:true,wasOnTeam:true}}));
 it("filters explicit generations",()=>expect(filterByGeneration([{generation:1},{generation:2}],2)).toEqual([{generation:2}]));
});
