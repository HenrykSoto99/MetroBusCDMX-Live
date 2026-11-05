import { Landing } from "@/components/landing";
import { network } from "@/lib/transit";
import { createMetrobusMock } from "@/lib/metrobus-mock";
export default function HomePage() { return <Landing network={network} initialFleet={createMetrobusMock(1793840000000)}/>; }
