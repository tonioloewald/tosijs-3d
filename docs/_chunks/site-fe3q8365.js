import{Ye,Uo,ai}from"./site-4jsq7n1s.js";import{P}from"./site-9sh5dtm0.js";import{o}from"./site-zrw6ygjx.js";class dm extends Ye{constructor(e){super(e);this.config=e,this._inputCases=new Map,this.case=this.registerDataInput("case",P,NaN),this.default=this.registerDataInput("default",P),this.value=this.registerDataOutput("value",P);let s=this.config.cases||[];for(let t of s){if(t=ai(t),this.config.treatCasesAsIntegers){if(t=t|0,this._inputCases.has(t))return}this._inputCases.set(t,this.registerDataInput(`in_${t}`,P))}}_updateOutputs(e){let s=this.case.getValue(e),t;if(Uo(s))t=this._getOutputValueForCase(ai(s),e);if(!t)t=this.default.getValue(e);this.value.setValue(t,e)}_getOutputValueForCase(e,s){return this._inputCases.get(e)?.getValue(s)}getClassName(){return"FlowGraphDataSwitchBlock"}}var a=!1;function pm(){if(a)return;a=!0,o("FlowGraphDataSwitchBlock",dm)}pm();
export{dm,pm};

//# debugId=FEAF3ECBA73D62A264756E2164756E21
//# sourceMappingURL=site-fe3q8365.js.map
