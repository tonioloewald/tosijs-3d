import{Ye,Uo,ai}from"./site-20s7pn47.js";import{I}from"./site-xbnd7pgz.js";import{o}from"./site-6g9cre7m.js";class dm extends Ye{constructor(e){super(e);this.config=e,this._inputCases=new Map,this.case=this.registerDataInput("case",I,NaN),this.default=this.registerDataInput("default",I),this.value=this.registerDataOutput("value",I);let s=this.config.cases||[];for(let t of s){if(t=ai(t),this.config.treatCasesAsIntegers){if(t=t|0,this._inputCases.has(t))return}this._inputCases.set(t,this.registerDataInput(`in_${t}`,I))}}_updateOutputs(e){let s=this.case.getValue(e),t;if(Uo(s))t=this._getOutputValueForCase(ai(s),e);if(!t)t=this.default.getValue(e);this.value.setValue(t,e)}_getOutputValueForCase(e,s){return this._inputCases.get(e)?.getValue(s)}getClassName(){return"FlowGraphDataSwitchBlock"}}var a=!1;function pm(){if(a)return;a=!0,o("FlowGraphDataSwitchBlock",dm)}pm();
export{dm,pm};

//# debugId=74DC883B1EB7257764756E2164756E21
//# sourceMappingURL=site-hc5cdp52.js.map
