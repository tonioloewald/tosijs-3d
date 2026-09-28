import{Ye}from"./site-c6g1b76s.js";import{ut}from"./site-wsw4wdqb.js";var l="cachedOperationValue",t="cachedExecutionId";class cr extends Ye{constructor(e,i){super(i);this.value=this.registerDataOutput("value",e),this.isValid=this.registerDataOutput("isValid",ut)}_updateOutputs(e){let i=e._getExecutionVariable(this,t,-1),s=e._getExecutionVariable(this,l,null);if(s!==void 0&&s!==null&&i===e.executionId)this.isValid.setValue(!0,e),this.value.setValue(s,e);else try{let a=this._doOperation(e);if(a===void 0||a===null){this.isValid.setValue(!1,e);return}e._setExecutionVariable(this,l,a),e._setExecutionVariable(this,t,e.executionId),this.value.setValue(a,e),this.isValid.setValue(!0,e)}catch(a){this.isValid.setValue(!1,e)}}}
export{cr};

//# debugId=D01E0CB74EDD426F64756E2164756E21
//# sourceMappingURL=site-v9d7a0gx.js.map
