import { describe, expect, it } from 'vitest';
import { dashboardRead } from '../src/features/dashboard/adapter';
describe('dashboard development adapter',()=>{
 it('filters before paginating and preserves total',async()=>{const first=await dashboardRead('sessions',{page:1,status:'Completed'});const second=await dashboardRead('sessions',{page:2,status:'Completed'});expect(first.total).toBe(72);expect(first.rows).toHaveLength(6);expect(first.rows.every(r=>r.status==='Completed')).toBe(true);expect(new Set([...first.rows,...second.rows].map(r=>r.id)).size).toBe(12);});
 it('distinguishes a failed financial summary from an empty result',async()=>{await expect(dashboardRead('summary',{state:'error'})).rejects.toThrow('unavailable');expect(await dashboardRead('summary',{state:'empty'})).toEqual([]);});
 it('cancels pending work',async()=>{const controller=new AbortController();const request=dashboardRead('activity',{signal:controller.signal,state:'loading'});controller.abort();await expect(request).rejects.toMatchObject({name:'AbortError'});});
});
