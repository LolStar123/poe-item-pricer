import test from 'node:test';
import assert from 'node:assert/strict';
import * as m from './model.mjs';
test('workflow invariants and boundary cases',()=>{
const r=m.risk([{probability:.5,price:0},{probability:.5,price:200}],80);assert.equal(r.ev,20);assert.equal(r.stdev,100);assert.equal(r.profitFactor,1.5);assert.equal(m.risk([{probability:.5,price:0},{probability:.5,price:null}],80).ev,null);assert.equal(m.medianBuyin([1,100,101,102,103,104,105,106,107,108]),103.5);assert.throws(()=>m.risk([{probability:.5,price:1}],1));
});
