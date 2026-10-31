import{Xe,Wo,li}from"./site-3hzw4f8j.js";import{O}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class mm extends Xe{constructor(e){super(e);this.config=e,this._inputCases=new Map,this.case=this.registerDataInput("case",O,NaN),this.default=this.registerDataInput("default",O),this.value=this.registerDataOutput("value",O);let s=this.config.cases||[];for(let t of s){if(t=li(t),this.config.treatCasesAsIntegers){if(t=t|0,this._inputCases.has(t))return}this._inputCases.set(t,this.registerDataInput(`in_${t}`,O))}}_updateOutputs(e){let s=this.case.getValue(e),t;if(Wo(s))t=this._getOutputValueForCase(li(s),e);if(!t)t=this.default.getValue(e);this.value.setValue(t,e)}_getOutputValueForCase(e,s){return this._inputCases.get(e)?.getValue(s)}getClassName(){return"FlowGraphDataSwitchBlock"}}var a=!1;function gm(){if(a)return;a=!0,o("FlowGraphDataSwitchBlock",mm)}gm();
export{mm,gm};

//# debugId=97B4FCF3D185955E64756E2164756E21
//# sourceMappingURL=site-h09e8gcx.js.map
