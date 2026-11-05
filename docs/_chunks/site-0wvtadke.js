import{$e,Uo,ci}from"./site-sxxg2v6h.js";import{O}from"./site-fszd7aez.js";import{o}from"./site-9mf4pzsy.js";class _m extends $e{constructor(e){super(e);this.config=e,this._inputCases=new Map,this.case=this.registerDataInput("case",O,NaN),this.default=this.registerDataInput("default",O),this.value=this.registerDataOutput("value",O);let s=this.config.cases||[];for(let t of s){if(t=ci(t),this.config.treatCasesAsIntegers){if(t=t|0,this._inputCases.has(t))return}this._inputCases.set(t,this.registerDataInput(`in_${t}`,O))}}_updateOutputs(e){let s=this.case.getValue(e),t;if(Uo(s))t=this._getOutputValueForCase(ci(s),e);if(!t)t=this.default.getValue(e);this.value.setValue(t,e)}_getOutputValueForCase(e,s){return this._inputCases.get(e)?.getValue(s)}getClassName(){return"FlowGraphDataSwitchBlock"}}var a=!1;function xm(){if(a)return;a=!0,o("FlowGraphDataSwitchBlock",_m)}xm();
export{_m,xm};

//# debugId=60988434B75D552564756E2164756E21
//# sourceMappingURL=site-0wvtadke.js.map
