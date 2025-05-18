import streamlit as st
import streamlit.components.v1 as components

_component_func = components.declare_component(
    "key_capture",
    path="./frontend/build"
)

def key_capture():
    keys = _component_func(default=[])
    return keys