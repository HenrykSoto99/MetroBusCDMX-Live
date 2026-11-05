"use client";
import { useEffect } from "react";
import { create } from "zustand";
import type { FleetSnapshot } from "./transit-types";
export interface ApiTrace { id:number;time:string;status:number;duration:number }
interface LiveBusesState {
  fleet:FleetSnapshot|null;refreshing:boolean;error:string|null;traces:ApiTrace[];calls:number;
  initialize:(fleet:FleetSnapshot)=>void;refresh:()=>Promise<void>;clear:()=>void;
}
const REFRESH_MS=12_000;
let inFlight:Promise<void>|null=null;
let controller:AbortController|null=null;
let generation=0;
function cancelPrevious(){generation++;controller?.abort();controller=null;inFlight=null;}
export const useLiveBusesStore=create<LiveBusesState>((set,get)=>({
  fleet:null,refreshing:false,error:null,traces:[],calls:0,
  initialize:fleet=>{cancelPrevious();set({fleet,error:null,traces:[],calls:0,refreshing:false});},
  clear:()=>{cancelPrevious();set({fleet:null,error:null,traces:[],calls:0,refreshing:false});},
  refresh:()=>{
    if(inFlight)return inFlight;
    const requestGeneration=generation;
    const requestController=new AbortController();controller=requestController;
    inFlight=(async()=>{
      const start=performance.now();set({refreshing:true});
      try {
        const response=await fetch("/api/fleet",{cache:"no-store",signal:requestController.signal});
        if(requestGeneration!==generation)return;
        set(state=>({calls:state.calls+1,traces:[{id:Date.now(),time:new Date().toISOString(),status:response.status,duration:Math.round(performance.now()-start)},...state.traces].slice(0,6)}));
        if(response.status===401){get().clear();window.location.assign("/login");return;}
        if(!response.ok)throw new Error("No pudimos actualizar la simulación.");
        const fleet=await response.json() as FleetSnapshot;
        if(requestGeneration!==generation)return;
        if(!Array.isArray(fleet.vehicles))throw new Error("La respuesta de la red no es válida.");
        set({fleet,error:null});
      }catch(error){
        if(requestGeneration===generation && !requestController.signal.aborted)set({error:error instanceof Error?error.message:"No hay conexión. Conservamos la última posición."});
      }finally{
        if(requestGeneration===generation){set({refreshing:false});inFlight=null;controller=null;}
      }
    })();
    return inFlight;
  },
}));
export function useLiveBuses(initialFleet:FleetSnapshot){
  const state=useLiveBusesStore();
  useEffect(()=>{
    const store=useLiveBusesStore.getState();store.initialize(initialFleet);void store.refresh();
    const poll=setInterval(()=>{if(!document.hidden)void useLiveBusesStore.getState().refresh();},REFRESH_MS);
    const visible=()=>{if(!document.hidden)void useLiveBusesStore.getState().refresh();};
    document.addEventListener("visibilitychange",visible);
    return()=>{clearInterval(poll);document.removeEventListener("visibilitychange",visible);useLiveBusesStore.getState().clear();};
  },[initialFleet]);
  const fleet=state.fleet && state.fleet.timestamp>=initialFleet.timestamp?state.fleet:initialFleet;
  return {...state,fleet};
}
