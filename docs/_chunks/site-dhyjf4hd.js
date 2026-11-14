import{$e,Uo,ci}from"./site-3t3g319r.js";import{w}from"./site-8r8s7x74.js";import{o}from"./site-twypjy9n.js";class Em extends $e{constructor(e){super(e);this.config=e,this._inputCases=new Map,this.case=this.registerDataInput("case",w,NaN),this.default=this.registerDataInput("default",w),this.value=this.registerDataOutput("value",w);let s=this.config.cases||[];for(let t of s){if(t=ci(t),this.config.treatCasesAsIntegers){if(t=t|0,this._inputCases.has(t))return}this._inputCases.set(t,this.registerDataInput(`in_${t}`,w))}}_updateOutputs(e){let s=this.case.getValue(e),t;if(Uo(s))t=this._getOutputValueForCase(ci(s),e);if(!t)t=this.default.getValue(e);this.value.setValue(t,e)}_getOutputValueForCase(e,s){return this._inputCases.get(e)?.getValue(s)}getClassName(){return"FlowGraphDataSwitchBlock"}}var a=!1;function Rm(){if(a)return;a=!0,o("FlowGraphDataSwitchBlock",Em)}Rm();
export{Em,Rm};

//# debugId=31B9F05A6170A02364756E2164756E21
//# sourceMappingURL=site-dhyjf4hd.js.map
