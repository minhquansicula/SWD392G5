package com.backend;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

class ModularityTest {

    @Test
    void printModularStructure() {
        ApplicationModules modules = ApplicationModules.of(BackEndApplication.class);
        System.out.println(modules);
    }
}
