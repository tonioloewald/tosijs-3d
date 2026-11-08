import{$e,Wo,ci}from"./site-2z9zdtr9.js";import{w}from"./site-6xzhcvhx.js";import{o}from"./site-rtzsfcas.js";class Sm extends $e{constructor(e){super(e);this.config=e,this._inputCases=new Map,this.case=this.registerDataInput("case",w,NaN),this.default=this.registerDataInput("default",w),this.value=this.registerDataOutput("value",w);let s=this.config.cases||[];for(let t of s){if(t=ci(t),this.config.treatCasesAsIntegers){if(t=t|0,this._inputCases.has(t))return}this._inputCases.set(t,this.registerDataInput(`in_${t}`,w))}}_updateOutputs(e){let s=this.case.getValue(e),t;if(Wo(s))t=this._getOutputValueForCase(ci(s),e);if(!t)t=this.default.getValue(e);this.value.setValue(t,e)}_getOutputValueForCase(e,s){return this._inputCases.get(e)?.getValue(s)}getClassName(){return"FlowGraphDataSwitchBlock"}}var a=!1;function ym(){if(a)return;a=!0,o("FlowGraphDataSwitchBlock",Sm)}ym();
export{Sm,ym};

//# debugId=FF123230FD369BDD64756E2164756E21
//# sourceMappingURL=site-ks8wyjym.js.map
