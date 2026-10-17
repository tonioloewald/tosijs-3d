import{Ye,Go,ai}from"./site-5mxcr40t.js";import{P}from"./site-xahfg9zj.js";import{o}from"./site-cpxwd5wy.js";class hm extends Ye{constructor(e){super(e);this.config=e,this._inputCases=new Map,this.case=this.registerDataInput("case",P,NaN),this.default=this.registerDataInput("default",P),this.value=this.registerDataOutput("value",P);let s=this.config.cases||[];for(let t of s){if(t=ai(t),this.config.treatCasesAsIntegers){if(t=t|0,this._inputCases.has(t))return}this._inputCases.set(t,this.registerDataInput(`in_${t}`,P))}}_updateOutputs(e){let s=this.case.getValue(e),t;if(Go(s))t=this._getOutputValueForCase(ai(s),e);if(!t)t=this.default.getValue(e);this.value.setValue(t,e)}_getOutputValueForCase(e,s){return this._inputCases.get(e)?.getValue(s)}getClassName(){return"FlowGraphDataSwitchBlock"}}var a=!1;function dm(){if(a)return;a=!0,o("FlowGraphDataSwitchBlock",hm)}dm();
export{hm,dm};

//# debugId=34DE23E96003E76564756E2164756E21
//# sourceMappingURL=site-6y2tkxta.js.map
